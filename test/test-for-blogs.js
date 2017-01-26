const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const TEST_DATABASE_URL = require('../config');

chai.use(chaiHttp);

function generateBlogData(){
	return {
		author: {
			firstName: faker.Name.firstName(),
			lastName: faker.Name.lastName()
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

	BlogPost.insertMany(seedData);
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
				.get('/blogposts')
				.then(response => {
					response.should.have.status(200);
					response.body.blogposts.should.have.length.of.at.least(1);
					return BlogPost.count();
				})
				.then(count => {
					res.body.blogposts.should.have.length.of(count);
				});
		});

		it('should return blog posts that have the required fields', function(){
      		let resBlogPost;
      		return chai.request(app)
        		.get('/blogposts')
        		.then(function(res) {
          			res.should.have.status(200);
          			res.should.be.json;
          			res.body.blogposts.should.be.a('array');
          			res.body.blogposts.should.have.length.of.at.least(1);

          			res.body.restaurants.forEach(blogPost => {
            			blogPost.should.be.a('object');
            			blogPost.should.include.keys('id', 'author', 'title', 'content', 'created');
          			});
          			resBlogPost = res.body.blogposts[0];
          			return Restaurant.findById(resBlogPost.id);
        		})
        		.then(blogPost => {
					resBlogPost.id.should.equal(blogPost.id);
          			resBlogPost.author.firstName.should.equal(blogPost.author.firstName);
          			resBlogPost.author.lastName.should.equal(blogPost.author.lastName);
          			resBlogPost.title.should.equal(blogPost.title);
          			resBlogPost.content.should.contain(blogPost.content);
					resBlogPost.created.should.equal(blogPost.created);
        		});
		});

		it('should return the blog post corresponding with the provided id', function(){
			let resBlogPost;
			return BlogPost
				.findOne()
				.exec()
				.then(blogPost => {
					return chai.request(app)
						.get(`/blogposts/${blogPost.id}`)
						.then(res => {
          					res.should.have.status(200);
          					res.should.be.json;
          					res.should.be.a('object');
          					res.should.include.keys('id', 'author', 'title', 'content', 'created');
          					resBlogPost = res;
          					return BlogPost.findById(resBlogPost.id);
						})
						.then(blogPost => {
							resBlogPost.id.should.equal(blogPost.id);
          					resBlogPost.author.firstName.should.equal(blogPost.author.firstName);
          					resBlogPost.author.lastName.should.equal(blogPost.author.lastName);
          					resBlogPost.title.should.equal(blogPost.title);
          					resBlogPost.content.should.contain(blogPost.content);
							resBlogPost.created.should.equal(blogPost.created);
						});
				})
		});

	});

	describe('POST endpoint', function(){
		it('should add a new blog', function(){

			const newBlog = generateBlogData();

			return chai.request(app)
				.post('/blogposts')
				.send(newBlog)
				.then(res => {
					res.should.have.status(201);
					res.should.be.json;
					res.body.should.be.a('object');
					res.body.should.include.keys('id', 'author', 'title', 'content', 'created');
					res.body.id.should.not.be.null;
					res.body.created.should.not.be.null;
					res.body.author.firstName.should.equal(newBlog.author.firstName);
					res.body.author.lastName.should.equal(newBlog.author.lastName);
					res.body.title.should.equal(newBlog.title);
					res.body.content.should.equal(newBlog.content);
					return BlogPost.findById(res.body.id);
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
						.delete(`/blogposts/${blog.id}`)
						.then(res => {
							res.should.have.status(204);
							return BlogPost.findById(blogPost.id);
						})
						.then(_blogPost => {
							_blogPost.should.not.exist();
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
				.then(blogpost => {
					updatedBlogFields.id = blogPost.id;
					return chai.request(app)
						.put(`/blogposts/${updatedBlogFields.id}`)
						.send(updatedBlogFields)
						.then(res => {
							res.should.have.status(204);
							
							return BlogPost.findById(updatedBlogFields.id);
						})
						.then(blogPost => {
							blogPost.author.firstName.should.equal(updatedBlogFields.author.firstName);
							blogPost.author.firstName.should.equal(updatedBlogFields.author.lastName);
							blogPost.title.should.equal(updatedBlogFields.title);
							blogPost.content.should.equal(updatedBlogFields.content);
						});
				});
		});

	});

});
