const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function generateBlogData(){
	return {
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},
		title: faker.lorem.words(),
		content: faker.lorem.sentences()
	};
}

function seedBlogData(){
	console.info('Seeding data for BlogPost API...');
	const seedData = [];

	for(let i = 0; i<=10; i++){
		seedData.push(generateBlogData());
	}

	return BlogPost.insertMany(seedData);
}

function dropDatabase(){
    console.warn('Deleting database...');
    return mongoose.connection.dropDatabase();
}

describe('BlogPost API resource', function(){

	before(function(){
		return runServer(TEST_DATABASE_URL);
	});
	beforeEach(function(){
		return seedBlogData();
	});
	afterEach(function(){
		return dropDatabase();
	});
	after(function(){
		return closeServer();
	});

	describe('GET endpoint', function(){

		it('should return all existing blog posts', function(){
			let res;
			return chai.request(app)
				.get('/posts')
				.then(response => {
					res=response;
					response.should.have.status(200);
					response.body.should.have.length.of.at.least(1);
					return BlogPost.count();
				})
				.then(count => {
					res.body.should.have.length.of(count);
				});
		});
		it('should return blog posts that have the required fields', function(){
      		let resBlogPost;
      		return chai.request(app)
        		.get('/posts')
        		.then(function(res) {
          			res.should.have.status(200);
          			res.should.be.json;
          			res.body.should.be.a('array');
          			res.body.should.have.length.of.at.least(1);

          			res.body.forEach(blogPost => {
            			blogPost.should.be.a('object');
            			blogPost.should.include.keys('id', 'author', 'title', 'content', 'created');
          			});
          			resBlogPost = res.body[0];
          			return BlogPost.findById(resBlogPost.id).exec();
        		})
        		.then(blogPost => {
					resBlogPost.id.should.equal(blogPost.id);
          			resBlogPost.author.should.equal(blogPost.authorName);
          			resBlogPost.title.should.equal(blogPost.title);
          			resBlogPost.content.should.contain(blogPost.content);
          			const resCreated = (new Date(resBlogPost.created)).getTime();
          			const databaseCreated = (new Date(blogPost.created)).getTime();
					resCreated.should.equal(databaseCreated);
        		});
		});

		it('should return the blog post corresponding with the provided id', function(){
			let resBlogPost;
			return BlogPost
				.findOne()
				.exec()
				.then(blogPost => {
					return chai.request(app)
						.get(`/posts/${blogPost.id}`)
						.then(res => {
          					res.should.have.status(200);
          					res.should.be.json;
          					res.body.should.be.a('object');
          					res.body.should.include.keys('id', 'author', 'title', 'content', 'created');
          					resBlogPost = res.body;
          					return BlogPost.findById(resBlogPost.id).exec();
						})
						.then(blogPost => {
							resBlogPost.id.should.equal(blogPost.id);
          					resBlogPost.author.should.equal(blogPost.authorName);
          					resBlogPost.title.should.equal(blogPost.title);
          					resBlogPost.content.should.contain(blogPost.content);
							const resCreated = (new Date(resBlogPost.created)).getTime();
          					const databaseCreated = (new Date(blogPost.created)).getTime();
							resCreated.should.equal(databaseCreated);
						});
				})
		});

	});

	describe('POST endpoint', function(){
		it('should add a new blog', function(){

			const newBlog = generateBlogData();

			return chai.request(app)
				.post('/posts')
				.send(newBlog)
				.then(res => {
					res.should.have.status(201);
					res.should.be.json;
					res.body.should.be.a('object');
					res.body.should.include.keys('id', 'author', 'title', 'content', 'created');
					res.body.id.should.not.be.null;
					res.body.created.should.not.be.null;
					res.body.author.should.equal(`${newBlog.author.firstName} ${newBlog.author.lastName}`);
					res.body.title.should.equal(newBlog.title);
					res.body.content.should.equal(newBlog.content);
					return BlogPost.findById(res.body.id).exec();
				})
				.then(blogpost => {
					blogpost.author.firstName.should.equal(newBlog.author.firstName);
					blogpost.author.lastName.should.equal(newBlog.author.lastName);
					blogpost.title.should.equal(newBlog.title);
					blogpost.content.should.equal(newBlog.content);
				});
		});
	});

	describe('DELETE endpoint', function(){
		it('should delete a Blog Post', function(){

			let blogPost;
			return BlogPost
				.findOne()
				.exec()
				.then(blog => {
					blogPost = blog;
					return chai.request(app)
						.delete(`/posts/${blog.id}`)
						.then(res => {
							res.should.have.status(204);
							return BlogPost.findById(blogPost.id).exec();
						})
						.then(_blogPost => {
							should.not.exist(_blogPost);
						});
				});
		});
	});

	describe('PUT endpoint', function(){

		it('should update fields you send in request', function(){
			let updatedBlogFields = generateBlogData();
			return BlogPost
				.findOne()
				.exec()
				.then(blogPost => {
					updatedBlogFields.id = blogPost.id;
					return chai.request(app)
						.put(`/posts/${updatedBlogFields.id}`)
						.send(updatedBlogFields)
						.then(res => {
							res.should.have.status(201);
							
							return BlogPost.findById(updatedBlogFields.id).exec();
						})
						.then(blogPost => {
							blogPost.author.firstName.should.equal(updatedBlogFields.author.firstName);
							blogPost.author.lastName.should.equal(updatedBlogFields.author.lastName);
							blogPost.title.should.equal(updatedBlogFields.title);
							blogPost.content.should.equal(updatedBlogFields.content);
						});
				});
		});
	});
});
